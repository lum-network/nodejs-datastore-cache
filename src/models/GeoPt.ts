import * as datastore from '@google-cloud/datastore';
import { Expose } from 'class-transformer';

export class GeoPt {
    @Expose()
    latitude: number;

    @Expose()
    longitude: number;

    constructor(latitude: number, longitude: number) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    toDatastore = (store: datastore.Datastore): unknown => {
        return store.geoPoint({ latitude: this.latitude, longitude: this.longitude });
    };

    toPlain = (): { latitude: number; longitude: number } => {
        return { latitude: this.latitude, longitude: this.longitude };
    };
}
