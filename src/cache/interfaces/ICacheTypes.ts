type ICacheString = string | null;
type ICacheStringArray = Array<string | null>;
type ICacheStringMap = { [key: string]: string };

enum CacheClientEvent {
    Ready = 'ready',
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Closed = 'closed',
}

export type { ICacheString, ICacheStringArray, ICacheStringMap };
export { CacheClientEvent };
