function notify(db, userId, type, title, message = null) {
    db.run(
        `INSERT INTO notifications
         (user_id, type, title, message, read, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [userId, type, title, message, new Date().toISOString()]
    );
}

function logAdminAction(db, adminId, action, resource = null, resourceId = null, result = 'success') {
    db.run(
        `INSERT INTO admin_actions
         (admin_id, action, resource, resource_id, result, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, action, resource, resourceId ? String(resourceId) : null, result, new Date().toISOString()]
    );
}

// Nunca deixe estes campos saírem para o frontend.
function publicUser(row) {
    // row order: id,email,name,role,verified,blocked,created_at,last_login,avatar_url
    return {
        id: row[0],
        email: row[1],
        name: row[2],
        role: row[3],
        verified: Boolean(row[4]),
        blocked: Boolean(row[5]),
        created_at: row[6],
        last_login: row[7],
        avatar_url: row[8] || null
    };
}

module.exports = { notify, logAdminAction, publicUser };
