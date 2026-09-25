import * as SecureStore from 'expo-secure-store';
import { createSecureSessionStorage } from './secureSessionStorage';

export const sessionStorage = createSecureSessionStorage(SecureStore);
