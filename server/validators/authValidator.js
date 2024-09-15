const { check, validationResult } = require("express-validator");

const validateRegister = [
  check("username")
    .not()
    .isEmpty()
    .withMessage("Nom d'utilisateur est obligatoire"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Le mot de passe doit comporter au moins 6 caractères"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = { validateRegister };
