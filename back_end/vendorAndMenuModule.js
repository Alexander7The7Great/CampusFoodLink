//get all of the vendors from the database
async function getVendors(db) {
    return db.all('SELECT * FROM vendor')
}
async function getVendorID(db, userID) {
    return db.get('SELECT vendor_id FROM vendor WHERE user_id = ?',
    [userID])
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
        //only pull the menu items that are available as others would waste space as they do not 
        //provide any functional benefit for being displayed
        'SELECT * FROM menu_item WHERE vendor_id = ? AND available = ?', [venID, 'Yes']
    )

    //get the vendor and their available items altogether
    return {
        ...vendor,
        menuItems: menu
    }
}


async function getMenuForVendor(db, venID) {
    const vendor = await getVendorByID(db, venID)
    const menu = await db.all(
        //Pull all the items on the menu for the vendor to see and change
        'SELECT * FROM menu_item WHERE vendor_id = ?', [venID]
    )

    //get the vendor and their available items altogether
    return {
        ...vendor,
        menuItems: menu
    }
}

async function updateAvailability(db, itemID, available) {
    return db.run('UPDATE menu_item SET available = ? WHERE item_id = ?', [available, itemID])
}


module.exports = {
    getVendors,
    getVendorID,
    getVendorsMenu,
    getVendorByID,
    getMenuForVendor
}