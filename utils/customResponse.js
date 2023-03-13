const success = (res, message, body, status = 200) => {
  return res
    .send({
      message,
      body,
      status,
    })
    .status(status);
}

const error = (res, message, status = 400) => {
  return res
    .send({
      message,
      status,
    })
    .status(status);
}


module.exports = {
  success,
  error
}




