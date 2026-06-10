/**
 * Reverse provides a function for reversing strings.
 * @namespace Reverse
 * @author A. Freddie Page
 * @version 2021/22
 */
const Reverse = Object.create(null);

/**
 * Takes a string and reverses the order of its characters.
 * @memberof Reverse
 * @function
 * @param {string} string The string to reverse.
 * @returns {string} The same string with the order of it's characters reversed.
 */
Reverse.reverse = function (string) {
    // Implementation is to convert the string to an array of characters.
    // Reverse the order of the array, then recombining into a single string.
    return string.split("").reverse().join("");
};

export default Object.freeze(Reverse);
