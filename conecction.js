const { Sequelize } = require('sequelize');

const sequelize = (username, password, database='master') => {
    const connection = new Sequelize(database, username, password, {
        dialect: 'mssql',
        port: 1433,
        pool: {
            max: 5,
            min: 0,
            idle: 10000,
        },
        dialectOptions: {
            options: {
                encrypt: true,
            },
        },
    });
    return connection;
}

module.exports = sequelize;
