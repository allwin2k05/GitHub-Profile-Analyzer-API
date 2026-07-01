import AppError from "../utils/AppError.js";

export default function validateRequest(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(new AppError(result.error.issues[0].message, 400));
    }

    Object.assign(req[source], result.data);

    next();
  };
}
