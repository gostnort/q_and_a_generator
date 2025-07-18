const ownerIdentities = [
    'gostnort@hotmail.com'
];

function isValidOwner(identity) {
    return ownerIdentities.includes(identity.toLowerCase());
}

const testFolders = ['sample'];