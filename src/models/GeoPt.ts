import * as datastore from '@google-cloud/datastore';
import { Expose } from 'class-transformer';

/**
 * Wrapper class to build datastore Geo Points based on latitude and longitude parameters
 *
 * ```typescript
 * // Create a GeoPt instance
 * const pt = new GeoPt(42.0, 2.0);
 * ```
 */
export class GeoPt {
    @Expose()
    latitude: number;

    @Expose()
    longitude: number;

    /**
     * Create a new GeoPt instance from latitude and longitude
     * @param latitude Geo point latitude
     * @param longitude Geo point longitude
     */
    constructor(latitude: number, longitude: number) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    /**
     * Converts the current GeoPt instance into a datastore geopoint instance usable for direct datastore calls
     * such as save.
     * @param store A datastore instance
     * @returns A datastore geopoint instance
     */
    toDatastore = (store: datastore.Datastore): unknown => {
        return store.geoPoint({ latitude: this.latitude, longitude: this.longitude });
    };

    /**
     * Converts the current GeoPt instance into a plain object with a latitude and a longitude.
     * @returns Plain object
     */
    toPlain = (): { latitude: number; longitude: number } => {
        return { latitude: this.latitude, longitude: this.longitude };
    };
}
