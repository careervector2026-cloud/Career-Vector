import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Student = sequelize.define('Student', {
    rollNumber: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
        field: 'roll_number' // Maps JS 'rollNumber' -> DB 'roll_number'
    },
    fullName: {
        type: DataTypes.STRING,
        field: 'full_name'   // Maps JS 'fullName' -> DB 'full_name'
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userName: {
        type: DataTypes.STRING,
        field: 'user_name'   // Maps JS 'userName' -> DB 'user_name'
    },
    dept: {
        type: DataTypes.STRING,
        field: 'dept'
    },
    branch: {
        type: DataTypes.STRING,
        field: 'branch'
    },
    mobileNumber: {
        type: DataTypes.STRING(15),
        field: 'mobile_number' // Maps JS 'mobileNumber' -> DB 'mobile_number'
    },
    semester: {
        type: DataTypes.INTEGER,
        field: 'semester'
    },
    year: {
        type: DataTypes.INTEGER,
        field: 'year'
    },
    
    // GPA Columns (Explicit Mapping)
    gpaSem1: { type: DataTypes.DOUBLE, field: 'gpa_sem1' },
    gpaSem2: { type: DataTypes.DOUBLE, field: 'gpa_sem2' },
    gpaSem3: { type: DataTypes.DOUBLE, field: 'gpa_sem3' },
    gpaSem4: { type: DataTypes.DOUBLE, field: 'gpa_sem4' },
    gpaSem5: { type: DataTypes.DOUBLE, field: 'gpa_sem5' },
    gpaSem6: { type: DataTypes.DOUBLE, field: 'gpa_sem6' },
    gpaSem7: { type: DataTypes.DOUBLE, field: 'gpa_sem7' },
    gpaSem8: { type: DataTypes.DOUBLE, field: 'gpa_sem8' },

    profileImageUrl: {
        type: DataTypes.STRING,
        field: 'profile_image_url' // Maps JS 'profileImageUrl' -> DB 'profile_image_url'
    },
    resumeUrl: {
        type: DataTypes.STRING,
        field: 'resume_url'
    },
    leetcodeUrl: {
        type: DataTypes.STRING,
        field: 'leetcodeurl' // Note: DB column appears to be all lowercase in your screenshot
    },
    githubUrl: {
        type: DataTypes.STRING,
        field: 'github_url'
    },
    verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'verified'
    }
}, {
    tableName: 'student', 
    timestamps: false,
    underscored: true // Optional extra safety, but 'field' takes precedence
});

export default Student;