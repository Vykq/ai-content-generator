import { useState } from 'react';
import { login, register } from '../services/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

export default function AuthView({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      let user;
      if (isLogin) {
        user = await login(username, password);
      } else {
        user = await register(username, password);
      }

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? 'Login' : 'Register'}</CardTitle>
          <CardDescription>
            {isLogin
              ? 'Enter your credentials to access the Seedream Editor'
              : 'Create an account to use the Seedream Editor'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isSubmitting}
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isSubmitting}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? (isLogin ? 'Logging in...' : 'Registering...')
                : (isLogin ? 'Login' : 'Register')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-primary hover:underline"
                disabled={isSubmitting}
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
