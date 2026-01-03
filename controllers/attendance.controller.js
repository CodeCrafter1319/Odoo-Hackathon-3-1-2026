exports.checkIn = (req, res) => {
  res.json({
    message: "Checked in successfully",
    time: new Date()
  });
};
