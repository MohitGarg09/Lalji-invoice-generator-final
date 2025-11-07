# Deployment Security Guide

This application now includes password protection to secure your invoice generator and CRM system when deployed publicly.

## How It Works

1. **Access Password**: Users must enter a password before accessing the application
2. **Session Storage**: Authentication is stored in browser sessionStorage (clears when browser closes)
3. **Backend Verification**: Password is verified against the backend API

## Setup Instructions

### For Local Development

The default password is `admin123` (same as admin password). You can change this by setting environment variables.

### For Production Deployment (Vercel + Render)

#### Backend (Render)

1. In your Render dashboard, go to your service's **Environment** tab
2. Add the following environment variable:
   ```
   ACCESS_PASSWORD=your_secure_password_here
   ```
   - Use a strong, unique password
   - This is the password users will need to access the entire application
   - You can use a different password than `ADMIN_PASSWORD` if you want separate access levels

3. **Optional**: If you want the access password to be different from the admin password:
   ```
   ACCESS_PASSWORD=user_access_password
   ADMIN_PASSWORD=admin_editing_password
   ```

4. Restart your Render service after adding the environment variable

#### Frontend (Vercel)

1. In your Vercel dashboard, go to your project's **Settings** → **Environment Variables**
2. Make sure `VITE_API_BASE` is set to your Render backend URL:
   ```
   VITE_API_BASE=https://your-backend.onrender.com/api
   ```

3. Redeploy your frontend after setting environment variables

## Security Features

- ✅ Password-protected access to the entire application
- ✅ Session-based authentication (clears on browser close)
- ✅ Backend password verification
- ✅ Separate admin password for editing permissions (optional)

## Important Notes

1. **Password Security**: 
   - Use a strong password (at least 12 characters, mix of letters, numbers, symbols)
   - Never commit passwords to git
   - Change default passwords before deploying

2. **Session Management**:
   - Authentication persists only during the browser session
   - Users will need to re-enter password after closing the browser
   - This is intentional for security

3. **Backend Protection**:
   - The backend API endpoints are still accessible directly
   - For additional security, consider:
     - IP whitelisting on Render
     - Adding authentication middleware to all API endpoints
     - Using HTTPS only

## Testing

1. Start your backend server
2. Start your frontend development server
3. Open the application in your browser
4. You should see a login screen
5. Enter the password (default: `admin123` or your `ACCESS_PASSWORD`)
6. You should be granted access to the application

## Troubleshooting

- **Login not working**: Check that `ACCESS_PASSWORD` is set correctly in Render
- **Backend error**: Ensure the backend is running and accessible
- **CORS errors**: Check your `CORS_ALLOWED_ORIGINS` setting in Django settings

## Future Enhancements

For production use, consider:
- Multi-user authentication system
- Role-based access control (RBAC)
- JWT tokens for authentication
- Password reset functionality
- Two-factor authentication (2FA)

