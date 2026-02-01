import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Recruiter = sequelize.define('Recruiter', {
    // Schema says PK is email
    email: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    fullName: {
        type: DataTypes.STRING,
        field: 'full_name' // Maps JS camelCase to DB snake_case
    },
    password: {
        type: DataTypes.STRING
    },
    userName: {
        type: DataTypes.STRING,
        field: 'user_name'
    },
    companyName: {
        type: DataTypes.STRING,
        field: 'company_name'
    },
    imageUrl: {
        type: DataTypes.STRING,
        field: 'image_url'
    },
    mobile: {
        type: DataTypes.STRING
    },
    role: {
        type: DataTypes.STRING
    },
    // ID exists in table but isn't the PK
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        unique: true
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    tableName: 'recruiter', // Exact table name from schema
    timestamps: false,      // No createdAt/updatedAt columns in schema
    underscored: true
});

export default Recruiter;