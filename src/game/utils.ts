/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Retrieves an inactive item from a pool or creates a new one if the pool is exhausted.
 * Ensures that objects in the pool have an 'active' property.
 * @template T - The type of the object in the pool, must have an 'active' property.
 * @param {T[]} pool - The array representing the object pool.
 * @param {() => T} factory - A function that creates a new instance of the object if the pool is empty.
 * @returns {T} An inactive item from the pool or a newly created item.
 */
export const getFromPool = <T extends { active: boolean }>(pool: T[], factory: () => T): T => {
    const item = pool.find(p => !p.active);
    if (item) return item;
    const newItem = factory();
    pool.push(newItem);
    return newItem;
};

/**
 * Loads a set of images and returns a promise that resolves when all are loaded.
 */
export const loadImages = (paths: string[]): Promise<HTMLImageElement[]> => {
    return Promise.all(
        paths.map(path => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.src = path;
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(err);
            });
        })
    );
};

/**
 * Loads a set of images and returns a promise that resolves when all are loaded.
 */
export const loadImages = (paths: string[]): Promise<HTMLImageElement[]> => {
    return Promise.all(
        paths.map(path => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.src = path;
                img.onload = () => resolve(img);
                img.onerror = (err) => reject(err);
            });
        })
    );
};
