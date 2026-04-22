import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { isAuthenticated, getCurrentUser, type User } from '../lib/auth';

import LandingScreen from '../screens/LandingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VaultScreen from '../screens/VaultScreen';
import ChatScreen from '../screens/ChatScreen';
import PasswordsScreen from '../screens/PasswordsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminPaymentsScreen from '../screens/AdminPaymentsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const [userRole, setUserRole] = useState<'loading' | 'admin' | 'user'>('loading');

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = await getCurrentUser();
      // Only update role if we have a valid user with a definitive role
      if (user && user.role) {
        const newRole = user.role as 'admin' | 'user';
        setUserRole(newRole);
      } else if (user && !user.role) {
        // User exists but has no role property, default to 'user'
        setUserRole('user');
      }
      // If user is null/undefined, keep current role (don't downgrade admin to user)
    };
    
    checkAdminStatus();
    
    // Re-check admin status periodically to handle auth changes
    const interval = setInterval(checkAdminStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Show nothing while loading
  if (userRole === 'loading') {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Smart Finder') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Passwords') {
            iconName = focused ? 'lock-closed' : 'lock-closed-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Admin Dashboard') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Admin Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Payments') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      {userRole === 'admin' ? (
        <>
          <Tab.Screen name="Admin Dashboard" component={AdminScreen} />
          <Tab.Screen name="Admin Settings" component={AdminSettingsScreen} />
          <Tab.Screen name="Payments" component={AdminPaymentsScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Vault" component={VaultScreen} />
          <Tab.Screen name="Smart Finder" component={ChatScreen} />
          <Tab.Screen name="Passwords" component={PasswordsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Subscription" 
        component={SubscriptionScreen}
        options={{ title: 'Subscription' }}
      />
      <Stack.Screen 
        name="Upgrade" 
        component={UpgradeScreen}
        options={{ title: 'Upgrade Plan' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef<any>(null);
  const pendingDeepLink = useRef<{ hostname: string; path: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setAuthenticated(authStatus);
      setLoading(false);
    };

    checkAuth();

    // Set up an interval to check auth status periodically
    const interval = setInterval(checkAuth, 1000);

    return () => clearInterval(interval);
  }, []);

  // Process pending deep link when navigation is ready
  useEffect(() => {
    if (!loading && navigationRef.current && pendingDeepLink.current) {
      const { hostname, path } = pendingDeepLink.current;
      pendingDeepLink.current = null; // Clear pending link

      if (hostname === 'payment' && path === 'success') {
        Alert.alert(
          'Payment Successful!',
          'Your subscription has been updated. Please wait a moment while we process your payment.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigationRef.current?.navigate('Subscription');
              },
            },
          ]
        );
      } else if (hostname === 'payment' && path === 'cancel') {
        Alert.alert(
          'Payment Canceled',
          'Your payment was canceled. You can try again anytime.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigationRef.current?.navigate('Upgrade');
              },
            },
          ]
        );
      }
    }
  }, [loading]);

  // Handle deep links for Stripe checkout redirect
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { hostname, path, queryParams } = Linking.parse(event.url);
      
      console.log('Deep link received:', { hostname, path, queryParams, loading, navReady: !!navigationRef.current });

      // Only handle payment deep links
      if (hostname === 'payment' && (path === 'success' || path === 'cancel')) {
        // Queue the deep link if navigator isn't ready yet
        if (loading || !navigationRef.current) {
          console.log('Navigator not ready, queuing deep link');
          pendingDeepLink.current = { hostname, path };
          return;
        }

        // Navigator is ready, process immediately
        // Expo's Linking.parse splits zorliapp://payment/success into hostname='payment' and path='success'
        if (path === 'success') {
          Alert.alert(
            'Payment Successful!',
            'Your subscription has been updated. Please wait a moment while we process your payment.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigationRef.current?.navigate('Subscription');
                },
              },
            ]
          );
        } else if (path === 'cancel') {
          Alert.alert(
            'Payment Canceled',
            'Your payment was canceled. You can try again anytime.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigationRef.current?.navigate('Upgrade');
                },
              },
            ]
          );
        }
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {authenticated ? <MainStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
