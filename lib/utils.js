function assert(condition, {ifFails}) {
    if (condition === false) {
        console.error(ifFails);
    }
}

module.exports = {
    assert
};
