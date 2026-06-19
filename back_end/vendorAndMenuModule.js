//get all of the vendors from the database
async function getVendors(db) {
    return db.all('SELECT * FROM vendor')
}

//gets a specific vendor based on their id
async function getVendorByID(db, venID) {
    return db.get('SELECT * FROM vendor WHERE vendor_id = ?',
    [venID])
}

//gets the menu for a specific vendor
async function getVendorsMenu(db, venID) {
    const vendor = await getVendorByID(db, venID)
    const menu = await db.all(
        'SELECT * FROM menu_item WHERE vendor_id = ? AND available = ?', [venID, 'Yes']
    )

    return {
        ...vendor,
        menuItems: menu
    }
}

module.exports = {
    getVendors,
    getVendorsMenu,
    getVendorByID
}