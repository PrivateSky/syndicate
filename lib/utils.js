function assert(condition, {ifFails}) {
    if (condition === false) {
        $$.err(ifFails);
    }
}

module.exports = {
    assert
};
