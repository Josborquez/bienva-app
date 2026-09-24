# backend/tools/openfoodfacts.py
# Productos chilenos de Open Food Facts -> BORRADOR de migración para `foods`.
# No escribe en la base: el SQL se revisa y se copia a una migración a mano.
#
# Uso (desde backend/, sin instalar nada: uv trae duckdb solo para esta corrida):
#   uv run --with duckdb python tools/openfoodfacts.py descargar          # una vez; baja ~1,3 GB y lo borra
#   uv run --with duckdb python tools/openfoodfacts.py resumen
#   uv run --with duckdb python tools/openfoodfacts.py buscar "yoghurt protein" --max 5
#
# Fuente: export CSV oficial de Open Food Facts, generado cada noche. Se usa el
# export y no la API porque la API es para "1 llamada = 1 escaneo real"; bajar
# la base por API está prohibido.
#
# Licencia: base ODbL, contenidos Database Contents License. Hay que atribuir
# ("Datos de Open Food Facts, ODbL") y, si se usa públicamente una base derivada,
# ofrecerla bajo ODbL. Por eso las filas quedan con fuente 'Open Food Facts' y
# verificado = false: son datos de la comunidad, se verifican contra la etiqueta
# (tools/etiquetas.ts) antes de marcarlas.

import sys
from datetime import date
from pathlib import Path

import duckdb

# Export CSV oficial (TSV, ~1,3 GB comprimido, se regenera cada noche). Se baja
# de una vez en vez de consultar el Parquet de Hugging Face por rangos: ese
# camino hace cientos de peticiones y Hugging Face responde 429.
URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
USER_AGENT = "Bienva/0.1 (https://bienva.cl)"
CACHE = Path(__file__).parent / ".cache" / "off_chile.parquet"
CSV = CACHE.parent / "off_products.csv.gz"


def bajar_csv() -> None:
    """Descarga el export con reanudación (Range) si una corrida anterior quedó a medias."""
    import urllib.request

    ya = CSV.stat().st_size if CSV.exists() else 0
    req = urllib.request.Request(URL, headers={"User-Agent": USER_AGENT, **({"Range": f"bytes={ya}-"} if ya else {})})
    with urllib.request.urlopen(req, timeout=60) as res:
        if res.status == 200 and ya:  # el servidor ignoró el Range: empezar de cero
            ya = 0
        total = ya + int(res.headers.get("Content-Length", 0))
        with open(CSV, "ab" if ya else "wb") as f:
            hecho, ultimo = ya, 0
            while bloque := res.read(1 << 20):
                f.write(bloque)
                hecho += len(bloque)
                if hecho - ultimo >= 100 << 20:
                    print(f"  {hecho >> 20} / {total >> 20} MB", flush=True)
                    ultimo = hecho


def descargar() -> None:
    """Baja el export, filtra Chile con datos nutricionales y deja solo CACHE (pocas columnas)."""
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    print("Descargando export de Open Food Facts...")
    bajar_csv()
    print("Filtrando productos de Chile...")
    num = lambda col: f"try_cast(nullif(\"{col}\", '') AS DOUBLE)"
    con = duckdb.connect()
    con.execute(f"""
        COPY (
          SELECT
            code,
            nullif(trim(product_name), '') AS nombre,
            nullif(trim(brands), '') AS marca,
            nullif(serving_size, '') AS serving_size,
            {num('serving_quantity')} AS serving_g,
            nullif(quantity, '') AS quantity,
            {num('energy-kcal_100g')} AS kcal_100,
            {num('proteins_100g')} AS prot_100,
            {num('carbohydrates_100g')} AS carb_100,
            {num('fat_100g')} AS grasa_100,
            coalesce(try_cast(nullif(unique_scans_n, '') AS INTEGER), 0) AS scans,
            len(list_filter(string_split(coalesce(data_quality_errors_tags, ''), ','), t -> t <> '')) AS errores_calidad,
            try_cast(nullif(last_modified_t, '') AS BIGINT) AS last_modified_t
          FROM read_csv('{CSV.as_posix()}', delim = '\t', quote = '', header = true, all_varchar = true,
                        ignore_errors = true, max_line_size = 20000000)
          WHERE list_contains(string_split(coalesce(countries_tags, ''), ','), 'en:chile')
            AND coalesce(no_nutrition_data, '') NOT IN ('on', 'true', '1')
        ) TO '{CACHE.as_posix()}' (FORMAT parquet)
    """)
    CSV.unlink()  # 1,3 GB: no se guarda, se vuelve a bajar si hay que refrescar
    total, con_nutri = con.execute(f"""
        SELECT count(*), count(*) FILTER (WHERE kcal_100 IS NOT NULL AND prot_100 IS NOT NULL)
        FROM read_parquet('{CACHE.as_posix()}')
    """).fetchone()
    print(f"Listo: {CACHE} ({total} productos de Chile, {con_nutri} con kcal y proteína)")


def resumen() -> None:
    con = duckdb.connect()
    total, con_nutri, sin_errores = con.execute(f"""
        SELECT count(*),
               count(*) FILTER (WHERE kcal_100 IS NOT NULL AND prot_100 IS NOT NULL),
               count(*) FILTER (WHERE kcal_100 IS NOT NULL AND prot_100 IS NOT NULL AND errores_calidad = 0)
        FROM read_parquet('{CACHE.as_posix()}')
    """).fetchone()
    print(f"{total} productos de Chile; {con_nutri} con kcal y proteína; {sin_errores} de esos sin errores de calidad.")
    print("Marcas con más productos:")
    for marca, n in con.execute(f"""
        SELECT lower(trim(split_part(marca, ',', 1))) AS m, count(*) AS n
        FROM read_parquet('{CACHE.as_posix()}') WHERE marca IS NOT NULL AND kcal_100 IS NOT NULL
        GROUP BY m ORDER BY n DESC LIMIT 15
    """).fetchall():
        print(f"  {marca}: {n}")


def sql(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"


def num(n):
    return "null" if n is None else str(round(float(n), 1))


def borrador(fila: dict) -> str:
    kcal, prot, carb, grasa = fila["kcal_100"], fila["prot_100"], fila["carb_100"], fila["grasa_100"]
    serving_g = fila["serving_g"]
    if serving_g and 0 < serving_g <= 1000:
        desc = (fila["serving_size"] or f"{serving_g:g} g").strip().lower()
        g, f = serving_g, serving_g / 100
    else:
        desc, g, f = "100 g", 100, 1.0
    escala = lambda v: None if v is None else v * f

    avisos = []
    if fila["errores_calidad"]:
        avisos.append(f"{fila['errores_calidad']} error(es) de calidad en OFF")
    if None not in (prot, carb, grasa) and kcal:
        estimado = 4 * prot + 4 * carb + 9 * grasa
        if abs(estimado - kcal) > 0.25 * kcal + 10:
            avisos.append(f"kcal no cuadra con macros ({kcal:g} vs ~{estimado:.0f} por 100 g)")
    marca = (fila["marca"] or "").split(",")[0].strip() or None
    nombre = (fila["nombre"] or "").strip()
    alias = nombre.lower()

    return f"""-- Open Food Facts {fila['code']}  https://world.openfoodfacts.org/product/{fila['code']}  (leído {date.today()}, ODbL)
-- Por 100 g: {num(kcal)} kcal, {num(prot)} g prot, carb {num(carb)} g, grasa {num(grasa)} g. Porción OFF: {fila['serving_size'] or '?'}. Envase: {fila['quantity'] or '?'}. Escaneos: {fila['scans']}.
-- {'AVISO: ' + '; '.join(avisos) if avisos else 'Sin avisos de calidad.'}
-- REVISAR: nombre, categoria, aliases, que no le gane búsquedas genéricas; verificar contra etiqueta antes de verificado=true.
insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado)
select {sql(nombre)}, {sql(marca)}, null, array[{sql(alias)}], {sql(desc)}, {num(g)}, {num(escala(kcal))}, {num(escala(prot))}, {num(escala(carb))}, {num(escala(grasa))}, 'Open Food Facts', false
where not exists (select 1 from foods where nombre = {sql(nombre)} and marca is not distinct from {sql(marca)});
"""


def buscar(termino: str, maximo: int) -> None:
    con = duckdb.connect()
    palabras = [p for p in termino.lower().split() if p]
    condicion = " AND ".join(
        "strip_accents(lower(coalesce(nombre, '') || ' ' || coalesce(marca, ''))) LIKE '%' || strip_accents(?) || '%'"
        for _ in palabras
    )
    cur = con.execute(f"""
        SELECT * FROM read_parquet('{CACHE.as_posix()}')
        WHERE kcal_100 IS NOT NULL AND prot_100 IS NOT NULL AND nombre IS NOT NULL AND {condicion}
        ORDER BY errores_calidad, scans DESC, last_modified_t DESC
        LIMIT ?
    """, [*palabras, maximo])
    columnas = [d[0] for d in cur.description]
    filas = [dict(zip(columnas, f)) for f in cur.fetchall()]
    if not filas:
        print(f"-- sin resultados para {termino!r}")
    for fila in filas:
        print(borrador(fila))


def opcion(args, nombre, defecto):
    return args[args.index(nombre) + 1] if nombre in args else defecto


if __name__ == "__main__":
    args = sys.argv[1:]
    if args[:1] == ["descargar"]:
        descargar()
    elif not CACHE.exists() and args[:1] in (["resumen"], ["buscar"]):
        sys.exit(f"Falta {CACHE}; corre primero: uv run --with duckdb python tools/openfoodfacts.py descargar")
    elif args[:1] == ["resumen"]:
        resumen()
    elif args[:1] == ["buscar"] and len(args) > 1:
        buscar(args[1], int(opcion(args, "--max", 5)))
    else:
        sys.exit('Uso: openfoodfacts.py descargar | resumen | buscar "<término>" [--max N]')
