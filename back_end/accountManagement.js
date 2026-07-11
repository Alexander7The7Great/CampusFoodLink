//pull the profiles for the students in the campus dining services database
async function getAllStudents(db) {
    return db.all('SELECT * FROM "student_profile" sp JOIN user u ON u.email = (SELECT email FROM user WHERE user_id = sp.user_id)')
}

async function addVendor(db, vendorName, vendorDescrip, email, password) {

}

async function deleteVendor(db, venID) {

}

async function deleteStudent(db, studentId) {

}
module.exports = {
    getAllStudents
}