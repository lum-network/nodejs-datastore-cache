const ATTRIBUTES_KEY = 'datastore:attributes';

/**
 * Returns model attributes from class by restoring this
 * information from reflect metadata
 */
export function getAttributes(target: any): any | undefined {
    const attributes = Reflect.getMetadata(ATTRIBUTES_KEY, target);

    if (attributes) {
        return Object.keys(attributes).reduce((copy: any, key: any) => {
            copy[key] = { ...attributes[key] };
            return copy;
        }, {});
    }
}

/**
 * Sets attributes
 */
export function setAttributes(target: any, attributes: any): void {
    Reflect.defineMetadata(ATTRIBUTES_KEY, { ...attributes }, target);
}

/**
 * Adds model attribute by specified property name and
 * sequelize attribute options and stores this information
 * through reflect metadata
 */
export function addAttribute(target: any, name: string, options: any): void {
    let attributes = getAttributes(target);

    if (!attributes) {
        attributes = {};
    }
    attributes[name] = { ...options };

    setAttributes(target, attributes);
}
