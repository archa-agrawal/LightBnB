const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'archana',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

pool.connect(() => console.log('connected'))

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool.query(`SELECT * FROM users
    WHERE users.email = $1`, [email])
    .then((result) => {
      if(result.rows.length > 0){
        return result.rows[0];
      } else {
        return null;
      }
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool.query(`
    SELECT * FROM users
    WHERE id = $1
  `, [id])
  .then((result) => {
    if(result.rows.length > 0){
      return result.rows[0];
    } else {
      return null;
    }
  });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool.query(`
  INSERT INTO users (name, email, password)
  VALUES($1, $2, $3)
  RETURNING *`, [user.name, user.email, user.password])
  .then((result) => {
    return result.rows[0]
  })
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`
  SELECT properties.*, reservations.id AS id, start_date, end_date, AVG(rating) AS average_rating
  FROM reservations 
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY start_date
  LIMIT $2;
  `, [guest_id, limit])
  .then((result) => {
    const propertiesList = result.rows;
    return propertiesList;
  })
}

exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const queryParams = [];
  
  let queryString = `
  SELECT properties.*, tb1.average_rating 
  FROM properties
  JOIN 
  (SELECT property_id, AVG(rating) AS average_rating 
  FROM property_reviews group by property_id) as tb1 
  ON properties.id = tb1.property_id
  `
  let whereString = ''

  if(options.city) {
    queryParams.push(`%${options.city}%`);
    whereString += ` LOWER(city) LIKE LOWER($${queryParams.length})`;
  };

  if(options.owner_id) {
    queryParams.push(options.owner_id);
    if (whereString) {
      whereString += ` AND`
    }
    whereString += ` owner_id = $${queryParams.length}`
  };

  if(options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    if (whereString) {
      whereString += ` AND`
    }
    whereString += ` cost_per_night >= $${queryParams.length}`
  };

  if(options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    if (whereString) {
      whereString += ` AND`
    }
    whereString = `${whereString} cost_per_night <= $${queryParams.length}`
  };
  if(options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    if (whereString) {
      whereString += ` AND`
    }
    whereString = `${whereString} tb1.average_rating >= $${queryParams.length}`
  };

  if (whereString) {
    whereString = ` WHERE ${whereString}` 
  }

  queryParams.push(limit);
  queryString = `
  ${queryString}
  ${whereString} 
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  return pool.query(queryString, queryParams)
    .then((res) => {
      return res.rows});
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const fields = Object.keys(property).filter(field => !!property[field])
  let values = '';
  for(let field of fields){
    values = `${values},'${property[field]}'`;
  }

  values = values.substring(1);

  return pool.query(
    `INSERT INTO properties(${fields.toString()})
    VALUES(${values})
    RETURNING *`
  )
  
}
exports.addProperty = addProperty;
