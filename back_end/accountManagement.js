async function getAllStudents(db) {
    return db.all('SELECT * FROM "student_profile" sp JOIN user u ON u.email = (SELECT email FROM user WHERE user_id = sp.user_id)')
    }

module.exports = {
    getAllStudents
}