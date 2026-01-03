exports.getProfile = (req, res) => {
  res.json({
    email: req.user.email,
    role: req.user.role
  });
};
