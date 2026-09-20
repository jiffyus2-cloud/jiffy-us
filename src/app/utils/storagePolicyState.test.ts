import { describe, it, expect } from 'vitest';
import {
  INITIAL_STORAGE_POLICY,
  formatBytes,
  mergeStoragePolicy,
  pickStoragePolicy,
  validateStoragePolicy,
} from './storagePolicyState';

/**
 * La regla: el 5 y el 90 del código son solo el arranque. En cuanto el dueño
 * guarda otra cosa, manda lo guardado, y el código nunca lo pisa.
 */
describe('mergeStoragePolicy', () => {
  it('sin nada guardado, devuelve el estado inicial', () => {
    expect(mergeStoragePolicy(null)).toEqual(INITIAL_STORAGE_POLICY);
    expect(mergeStoragePolicy(undefined)).toEqual(INITIAL_STORAGE_POLICY);
    expect(mergeStoragePolicy({})).toEqual(INITIAL_STORAGE_POLICY);
  });

  it('lo guardado gana al inicial', () => {
    expect(mergeStoragePolicy({ maxDraftsPerUser: 2, draftRetentionDays: 30, storageCapacityGb: 50 })).toEqual({
      maxDraftsPerUser: 2,
      draftRetentionDays: 30,
      storageCapacityGb: 50,
    });
  });

  it('rellena con el inicial solo las claves que faltan', () => {
    const merged = mergeStoragePolicy({ maxDraftsPerUser: 8 });
    expect(merged.maxDraftsPerUser).toBe(8);
    expect(merged.draftRetentionDays).toBe(INITIAL_STORAGE_POLICY.draftRetentionDays);
    expect(merged.storageCapacityGb).toBe(INITIAL_STORAGE_POLICY.storageCapacityGb);
  });

  it('ignora valores inválidos (cero, negativos, texto) y se queda con el inicial', () => {
    expect(mergeStoragePolicy({ maxDraftsPerUser: 0 }).maxDraftsPerUser).toBe(INITIAL_STORAGE_POLICY.maxDraftsPerUser);
    expect(mergeStoragePolicy({ draftRetentionDays: -3 }).draftRetentionDays).toBe(INITIAL_STORAGE_POLICY.draftRetentionDays);
    expect(mergeStoragePolicy({ storageCapacityGb: 'mucho' }).storageCapacityGb).toBe(INITIAL_STORAGE_POLICY.storageCapacityGb);
  });

  it('acepta números guardados como texto y trunca los enteros', () => {
    expect(mergeStoragePolicy({ maxDraftsPerUser: '7' }).maxDraftsPerUser).toBe(7);
    expect(mergeStoragePolicy({ draftRetentionDays: 45.9 }).draftRetentionDays).toBe(45);
  });
});

describe('pickStoragePolicy', () => {
  it('descarta cualquier campo extra', () => {
    const picked = pickStoragePolicy({ ...INITIAL_STORAGE_POLICY, loaded: true } as any);
    expect(Object.keys(picked).sort()).toEqual(['draftRetentionDays', 'maxDraftsPerUser', 'storageCapacityGb']);
  });
});

describe('validateStoragePolicy', () => {
  it('el inicial es válido', () => {
    expect(validateStoragePolicy(INITIAL_STORAGE_POLICY)).toEqual({});
  });

  it('señala cada campo fuera de rango', () => {
    const errors = validateStoragePolicy({ maxDraftsPerUser: 0, draftRetentionDays: 2.5, storageCapacityGb: 0 });
    expect(Object.keys(errors).sort()).toEqual(['draftRetentionDays', 'maxDraftsPerUser', 'storageCapacityGb']);
  });
});

describe('formatBytes', () => {
  it('escala la unidad', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1,50 KB');
    expect(formatBytes(15 * 1024 ** 2)).toBe('15,0 MB');
    expect(formatBytes(2.5 * 1024 ** 3)).toBe('2,50 GB');
  });
});
