# Deploy Stockify online

## 1. MongoDB Atlas
1. Create a free cluster in MongoDB Atlas.
2. Add a database user with read/write access.
3. Allow network access from `0.0.0.0/0` for the initial deployment.
4. Copy the connection string and replace the placeholder password.

## 2. GitHub
1. Create a GitHub repository and push this project.
2. Do not commit `.env` or `node_modules`.

## 3. Render
1. Create a Blueprint or Web Service from the GitHub repository.
2. Set `MONGODB_URI` to the Atlas connection string.
3. Keep the generated `JWT_SECRET` and database credentials private.
4. Deploy and open the generated HTTPS URL.

The first deployment creates the administrator account using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
