function Queue() {
    const backingStorage = [];

    Object.defineProperty(this, 'length', {
        get() {
            return backingStorage.length
        },
        set(value) {
            backingStorage.length = value;
        }
    });

    Object.defineProperty(this, 'head', {
        get: () => {
            if (backingStorage.length > 0) {
                return backingStorage[0];
            }

            return null;
        }
    });

    Object.defineProperty(this, 'tail', {
        get: () => {
            const length = backingStorage.length;
            if (length > 0) {
                return backingStorage[length - 1];
            }

            return null;
        }
    });


    this.push = (value) => {
        backingStorage.push(value);
    };

    this.pop = () => {
        return backingStorage.shift();
    };

    this.front = function () {
        return this.head;
    };

    this.isEmpty = function () {
        return backingStorage.length === 0;
    };

    this[Symbol.iterator] = backingStorage[Symbol.iterator];

    this.toString = backingStorage.toString;
    this[Symbol.for('nodejs.util.inspect.custom')] = function() {
        return JSON.stringify(backingStorage);
    }

}

module.exports = Queue;
