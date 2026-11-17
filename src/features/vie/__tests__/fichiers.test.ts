import { nomFichier, typeDe } from '../fichiers';

jest.mock('expo-file-system', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('../../compte/store', () => ({}));

const octets = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

test('type réel : les premiers octets priment sur un en-tête générique', () => {
  expect(typeDe(octets('%PDF-1.7 ...'), 'application/octet-stream')).toBe('application/pdf');
  expect(typeDe(octets('\x89PNG\r\n'), undefined)).toBe('image/png');
  expect(typeDe(octets('\xff\xd8\xff'), undefined)).toBe('image/jpeg');
  expect(typeDe(octets('PK..'), 'application/vnd.oasis.opendocument.text; charset=binary')).toBe('application/vnd.oasis.opendocument.text');
  expect(typeDe(octets('????'), 'application/octet-stream')).toBeUndefined();
});

test('le certificat reçoit son extension', () => {
  expect(nomFichier('Certificat Scolarité - 2 par page - 2025', 'application/pdf')).toBe('Certificat Scolarité - 2 par page - 2025.pdf');
  expect(nomFichier('bulletin.pdf', 'application/pdf')).toBe('bulletin.pdf');
});
