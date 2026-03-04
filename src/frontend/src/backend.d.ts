import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Photo {
    id: string;
    latitude: number;
    note?: string;
    longitude: number;
    timestamp: Time;
    image: ExternalBlob;
}
export type Time = bigint;
export interface backendInterface {
    addPhoto(id: string, latitude: number, longitude: number, note: string | null, image: ExternalBlob): Promise<void>;
    deletePhoto(id: string): Promise<void>;
    getAllPhotos(): Promise<Array<Photo>>;
    getPhoto(id: string): Promise<Photo>;
    getPhotosInRange(minLat: number, maxLat: number, minLong: number, maxLong: number): Promise<Array<Photo>>;
}
