type ICacheString = string | null;
type ICacheStringArray = Array<string | null>;
type ICacheStringMap = { [key: string]: string };

/**
 * Events emitted by cache clients
 * Order and presence depends on the underlying cache layer and its implementation as a client
 */
enum CacheClientEvent {
    Ready = 'ready',
    Connected = 'connected',
    Reconnecting = 'reconnecting',
    Closed = 'closed',
}

export type { ICacheString, ICacheStringArray, ICacheStringMap };
export { CacheClientEvent };
