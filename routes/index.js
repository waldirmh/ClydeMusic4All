const express = require('express');
const router = express.Router();
const sequelize = require('../conecction');
const { translate } = require('@vitalets/google-translate-api');
const {success, error} = require("../utils/customResponse");
const { LocalStorage } = require('node-localstorage');
const localStorage = new LocalStorage('./scratch');
const { QueryTypes } = require('sequelize');
const moment = require('moment');

router.get('/', async (req, res, next) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  try {
    if (username.length > 0 && password.length > 0) res.redirect('/dashboard');
    else res.redirect('/login');
  } catch (e) {
    const text = await translate(e.message, {to: 'es',from: 'en'});
  }
});


router.get('/login', function(req, res) {
  res.render('login');
});

router.post('/changePassword', async (req, res) => {
  const { user, newpassword } = req.body;
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  
  try {
    await sequelize(username, password).query(
      `ALTER LOGIN [${user}] WITH PASSWORD = '${newpassword}';`,
      {
        type: QueryTypes.UPDATE,
      });
    return res.render('changePassword', {
      title: 'Cambiar contraseña de '+ user,
      name: user,
      success: 'Contraseña cambiada correctamente'
    });
  } catch (e) {
    return res.render('changePassword', {
      title: 'Cambiar contraseña de '+ user,
      name: user,
      error: e.message,
    });
  }
});


router.get('/changeStatus', async (req, res) => {
  const user = req.query.user;
  const status = req.query.status;
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  
  try {
    if (status == 1) {
      await sequelize(username, password).query(
        `ALTER LOGIN ${user} DISABLE`,
        {
          type: QueryTypes.UPDATE,
        });
    }else{
      await sequelize(username, password).query(
        `ALTER LOGIN [${user}] ENABLE`,
        {
          type: QueryTypes.UPDATE,
        });
    }
    const users = await sequelize(username, password)
      .query(
        `select * from sys.sql_logins`
        , {
          type: QueryTypes.SELECT,
        });
  
    const dataFormat = users.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
      modify_date: moment(item.modify_date).format('DD/MM/yyyy'),
    }));
    return res.render('users', {
      title: 'Lista de Logins',
      users: dataFormat || [],
        navigatePassword: (name) =>{
        res.redirect('/users/changePassword/'+name)
        }
    });
  } catch (e) {
    return res.render('users', {
      title: 'Lista de Logins',
      error: e.message
    });
  }
});

router.get('/sign-out', function(req, res) {
  localStorage.removeItem('password');
  localStorage.removeItem('username');
  res.redirect('/login');
});

router.post('/sign-in', async (req, res) => {
  const { user, password } = req.body;

  try {
    await sequelize(user, password).authenticate();
    
    localStorage.setItem('username', user);
    localStorage.setItem('password', password);
    return res.render('index', {
      title: 'Ingreso exitoso'
    });
  } catch (e) {
    
    return res.render('login', {
      error: e.message,
    });
  }
});

router.post('/newUsers', async (req, res) => {
  const { newUser, newPassword } = req.body;
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  console.log(newUser)
  try {
    await sequelize(username, password)
    .query(`
      CREATE LOGIN ${newUser} WITH PASSWORD = '${newPassword}';
    `);
    // await sequelize(username, password)
    //   .query(`
    //     CREATE USER ${newUser} FOR LOGIN ${newUser};
    //   `);
    return res.render('newUsers', {
      title: 'Nuevo usuario ',
      success: 'Usuario creado correctamente',
    });
  } catch (e) {
    return res.render('newUsers', {
      title: 'Nuevo usuario ',
      error: e.message,
    });
  }
});

router.get('/databases', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');

  try {
    const databases = await sequelize(username, password)
      .query(
        `select * from sys.databases order by create_date desc`
        , {
          type: QueryTypes.SELECT,
        });

    const dataFormat = databases.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
    }));

    res.render('databases', {
      title: 'Bases de datos',
      databases: dataFormat || [],
    });
  } catch (e) {
    res.render('databases', {
      title: 'Bases de datos',
      message: e.message,
    });
  }
});

router.get('/showDatabase/:name', async (req, res)=>{
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const {name} = req.params;

  try{
    const tables = await sequelize(username, password, name)
      .query(
        `SELECT * FROM sys.tables`
        , {
          type: QueryTypes.SELECT,
        });
    
    const dataFormat = tables.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
      modify_date: moment(item.modify_date).format('DD/MM/yyyy'),
    }));
    res.render('showDatabase', {
      title: name,
      tables: dataFormat || [],
    });
  }
  catch(e){
    res.render('showDatabase', {
      title: name,
      message: e.message,
    });
  }
})

router.get('/table', async (req, res)=>{
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { database, table } = req.query;

  try{
    const headers = await sequelize(username, password, database)
      .query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = 'dbo'
         AND TABLE_NAME = '${table}'
         ORDER BY ORDINAL_POSITION`
         ,{
          type: QueryTypes.SELECT,
        });

    const tables = await sequelize(username, password, database)
      .query(`SELECT * FROM ${table}`, {
          type: QueryTypes.SELECT,
        });

    res.render('table', {
      title: table,
      headers: headers || [],
      tables: tables || [],
      database,
      table,
    });
  }
  catch(e){
    console.log(e);
    res.render('table', {
      title: database,
      message: e.message,
    });
  }
})

router.get('/users', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');

  try {
    const users = await sequelize(username, password)
      .query(
        `select * from sys.sql_logins`
        , {
          type: QueryTypes.SELECT,
        });

    const dataFormat = users.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
      modify_date: moment(item.modify_date).format('DD/MM/yyyy'),
    }));

    res.render('users', {
      title: 'Lista de Logins',
      users: dataFormat || [],
      navigatePassword: (name) =>{
        res.redirect('/users/changePassword/'+name)
      }
    });
  } catch (e) {
    res.render('users', {
      title: 'Lista de Logins',
      message: e.message,
    });
  }
});

router.get('/assignDatabase', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { name } = req.query;

  try {
    const databases = await sequelize(username, password)
      .query(
        `select * from sys.databases order by create_date desc`
        , {
          type: QueryTypes.SELECT,
        });

    const dataFormat = databases.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
    }));
    
    res.render('assignDatabase', {
      title: 'Lista de Bases de datos',
      databases: dataFormat || [],
      user: name,
    });
  } catch (e) {
    res.render('assignDatabase', {
      title: 'Lista de Bases de datos',
      message: e.message,
      user: name,
    });
  }
});

router.get('/dashboard', async (req, res) => {
  return res.render('index', {
    title: 'Bienvenido'
  });
});

router.get('/usersToDatabase/:name', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { name }  = req.params;

  try {
    const users = await sequelize(username, password, name)
      .query(`select * from sys.database_principals where type_desc='SQL_USER'`, {
        type: QueryTypes.SELECT,
      });
    
    const dataFormat = users.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
      modify_date: moment(item.modify_date).format('DD/MM/yyyy'),
    }));

    return res.render('usersToDatabase', {
      title: 'Usuarios de ' + name,
      users: dataFormat || [],
      name: name,
    });
  } catch (error) {
    console.log(error);
    res.render('usersToDatabase', {
      title: 'Lista de Usuarios',
      message: error.message,
    });
  }
});

router.get('/permissionsUser', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { database, user } = req.query;

  try {
    const permissions = await sequelize(username, password, database)
      .query(
        `
        SELECT 
          OBJECT_NAME(major_id) AS TableName, 
          user_name(grantee_principal_id) AS UserName, 
          permission_name AS Permission
        FROM 
            sys.database_permissions
        WHERE 
            class = 1 
            AND minor_id = 0 
            AND OBJECT_NAME(major_id) IS NOT NULL
            AND user_name(grantee_principal_id) = '${user}'
        ORDER BY 
            TableName, UserName, Permission
        `, {
          type: QueryTypes.SELECT,
        });
        
    const tables = await sequelize(username, password, database)
      .query(
        `SELECT * FROM sys.tables`
        , {
          type: QueryTypes.SELECT,
        });
    
    const tablesFormat = tables.map(item => {
      const update = permissions.some(x => x.TableName === item.name && x.Permission === 'UPDATE');
      const remove = permissions.some(x => x.TableName === item.name && x.Permission === 'DELETE');
      const select = permissions.some(x => x.TableName === item.name && x.Permission === 'SELECT');
      const insert = permissions.some(x => x.TableName === item.name && x.Permission === 'INSERT');
      
      return {
        ...item,
        update: !update,
        select: !select,
        delete: !remove,
        insert: !insert,
      }
    });
    return res.render('permissionsUser', {
      title: 'Permisos de '+ user,
      tables: tablesFormat || [],
      permissions: permissions || [],
      database,
      user,
    });
  } catch (error) {
    return res.render('permissionsUser', {
      title: 'Permisos de '+ user,
      message: error.message,
    });
  }
})

router.get('/changePassword', async (req, res) => {
  const {name} = req.query;
  return res.render('changePassword', {
    title: 'Cambiar contraseña de '+ name,
    name: name
  });
});

router.get('/insertPermission', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { database, user, type, table } = req.query;

  try {
    await sequelize(username, password)
      .query(`
        EXEC dbo.newPermissionUser
        @type = '${type}',
        @table = '${table}',
        @user = '${user}',
        @database = '${database}'
      `, {
        type: QueryTypes.UPDATE,
      });
    return res.redirect(`/permissionsUser?database=${database}&user=${user}`);
  } catch(e) {
    return res.render('permissionsUser', {
      title: 'Permisos de '+ user,
      message: e.message,
    });
  }
});

router.get('/deletePermission', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { database, user, type, table } = req.query;

  try {
    await sequelize(username, password)
      .query(`
        EXEC dbo.deletePermissionUser
        @type = '${type}',
        @table = '${table}',
        @user = '${user}',
        @database = '${database}'
      `, {
        type: QueryTypes.UPDATE,
      });
    return res.redirect(`/permissionsUser?database=${database}&user=${user}`);
  } catch(e) {
    return res.render('permissionsUser', {
      title: 'Permisos de '+ user,
      message: e.message,
    });
  }
});

router.get('/assignDatabaseAction', async function(req, res) {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { database, user } = req.query;

  try {
    await sequelize(username, password, database).query(
      `CREATE USER ${user} FOR LOGIN ${user}`
    );

    const databases = await sequelize(username, password)
      .query(
        `select * from sys.databases order by create_date desc`
        , {
          type: QueryTypes.SELECT,
        });

    const dataFormat = databases.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
    }));

    return res.render('assignDatabase', {
      title: 'Lista de Bases de datos',
      databases: dataFormat || [],
      success: 'Se asigno correctamente la BD',
    });
  } catch (e) {
    return res.render('assignDatabase', {
      title: 'Lista de Bases de datos',
      message: e.message,
    });
  }
});

router.get('/newUsers/', async (req, res) => {
  return res.render('newUsers', {
    title: 'Nuevo usuario ',
  });
});

router.get('/deleteRow', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { title, data, database, table } = req.query;

  try {
    await sequelize(username, password, database)
      .query(`DELETE FROM ${table} WHERE ${title} = ${data}`);

      const headers = await sequelize(username, password, database)
        .query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = 'dbo'
          AND TABLE_NAME = '${table}'
          ORDER BY ORDINAL_POSITION`
         ,{
          type: QueryTypes.SELECT,
        });

      const tables = await sequelize(username, password, database)
        .query(`SELECT * FROM ${table}`, {
          type: QueryTypes.SELECT,
        });

    return res.render('table', {
      title: table,
      headers: headers || [],
      tables: tables || [],
      database,
      table,
      success: 'Se eliminó correctamente',
    })
  } catch (error) {
    return res.render('table', {
      error: error.message
    })
  }
});

router.get('/rolesUsersServer', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { name } = req.query;

  try {
    const roles = await sequelize(username, password)
      .query(`
        SELECT 
          name AS Role_Name,
          ISNULL(principal_id, 0) AS Principal_ID
        FROM 
          sys.server_principals
        WHERE 
          type = 'R'
      `, {
        type: QueryTypes.SELECT,
      });

    const rolesByUser = await sequelize(username, password)
      .query(`
        SELECT r.name, r.principal_id
        FROM sys.server_principals p
        JOIN sys.server_role_members rm ON p.principal_id = rm.member_principal_id
        JOIN sys.server_principals r ON rm.role_principal_id = r.principal_id
        WHERE p.name = '${name}';
      `, {
        type: QueryTypes.SELECT,
      });

    const rolesFormat = roles.filter(item => !rolesByUser.some(i => i.principal_id == item.Principal_ID));
    
    return res.render('rolesUsersServer', {
      title: 'Roles del servidor de ' + name,
      roles: rolesFormat || [],
      rolesBy: rolesByUser || [],
      user: name,
    });
  } catch (error) {
    return res.render('rolesUsersServer', {
      title: 'Roles del servidor de ' + name,
      message: error.message,
      user: name,
    });
  }
});

router.get('/deleteRolServer', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { user, rol } = req.query;

  try {
    await sequelize(username, password)
      .query(`ALTER SERVER ROLE ${rol} DROP MEMBER ${user}`, {
        type: QueryTypes.UPDATE,
      });
    return res.redirect(`/rolesUsersServer?name=${user}`);
  } catch(e) {
    return res.render('rolesUsersServer', {
      title: 'Roles del servidor de ' + user,
      message: e.message,
      user: user,
    });
  }
});

router.get('/addRolServer', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { user, rol } = req.query;

  try {
    await sequelize(username, password)
      .query(`ALTER SERVER ROLE ${rol} ADD MEMBER ${user}`, {
        type: QueryTypes.UPDATE,
      });
    return res.redirect(`/rolesUsersServer?name=${user}`);
  } catch(e) {
    return res.render('rolesUsersServer', {
      title: 'Roles del servidor de ' + user,
      message: e.message,
      user: user,
    });
  }
});

router.get('/usersToRoles/:name', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { name }  = req.params;

  try {
    const users = await sequelize(username, password, name)
      .query(`select * from sys.database_principals where type_desc='SQL_USER'`, {
        type: QueryTypes.SELECT,
      });
    
    const dataFormat = users.map(item => ({
      ...item,
      create_date: moment(item.create_date).format('DD/MM/yyyy'),
      modify_date: moment(item.modify_date).format('DD/MM/yyyy'),
    }));

    return res.render('usersToRoles', {
      title: 'Usuarios de ' + name,
      users: dataFormat || [],
      name: name,
    });
  } catch (error) {
    res.render('usersToRoles', {
      title: 'Lista de Usuarios',
      message: error.message,
    });
  }
});

router.get('/rolesUsers', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { user, database } = req.query;

  try {
    const roles = await sequelize(username, password, database)
      .query(`
        SELECT 
          name AS Role_Name,
          ISNULL(principal_id, 0) AS Principal_ID
        FROM 
          sys.database_principals
        WHERE 
          type = 'R'
      `, {
        type: QueryTypes.SELECT,
      });

    const rolesByUser = await sequelize(username, password, database)
      .query(`
        SELECT r.name, r.principal_id
        FROM sys.database_principals p
        JOIN sys.database_role_members rm ON p.principal_id = rm.member_principal_id
        JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
        WHERE p.name = '${user}';
      `, {
        type: QueryTypes.SELECT,
      });

    const rolesFormat = roles.filter(item => !rolesByUser.some(i => i.principal_id == item.Principal_ID));
    console.log(roles);
    return res.render('rolesUsers', {
      title: 'Roles de ' + user,
      roles: rolesFormat || [],
      rolesBy: rolesByUser || [],
      user,
      database,
    });
  } catch (error) {
    return res.render('rolesUsers', {
      title: 'Roles de ' + user,
      message: error.message,
      user,
      database,
    });
  }
});

router.get('/deleteRol', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { user, rol, database } = req.query;

  try {
    await sequelize(username, password, database)
      .query(`ALTER ROLE ${rol} DROP MEMBER ${user}`, {
        type: QueryTypes.UPDATE,
      });
    return res.redirect(`/rolesUsers?database=${database}&user=${user}`);
  } catch(e) {
    return res.render('rolesUsers', {
      title: 'Roles de ' + user,
      message: e.message,
      user,
    });
  }
});

router.get('/addRol', async (req, res) => {
  const password = localStorage.getItem('password');
  const username = localStorage.getItem('username');
  const { user, rol, database } = req.query;

  try {
    await sequelize(username, password, database)
      .query(`ALTER ROLE ${rol} ADD MEMBER ${user}`, {
        type: QueryTypes.UPDATE,
      });
    return res.redirect(`/rolesUsers?database=${database}&user=${user}`);
  } catch(e) {
    return res.render('rolesUsers', {
      title: 'Roles de ' + user,
      message: e.message,
      user,
    });
  }
});

module.exports = router;

