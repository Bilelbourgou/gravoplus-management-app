import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

import { HomeScreen } from '../screens/HomeScreen';
import { ClientSelectScreen } from '../screens/ClientSelectScreen';
import { MachineSelectScreen } from '../screens/MachineSelectScreen';
import { CalculationScreen } from '../screens/CalculationScreen';
import { ServicesScreen } from '../screens/ServicesScreen';
import { DevisSummaryScreen } from '../screens/DevisSummaryScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { DevisDetailScreen } from '../screens/DevisDetailScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  NewDevisTab: undefined;
  HistoryTab: undefined;
};

export type NewDevisStackParamList = {
  ClientSelect: undefined;
  MachineSelect: { clientId: string; devisId?: string };
  Calculation: { devisId: string; machineType: string };
  Services: { devisId: string };
  DevisSummary: { devisId: string };
};

export type HistoryStackParamList = {
  HistoryList: undefined;
  DevisDetail: { devisId: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const NewDevisStack = createNativeStackNavigator<NewDevisStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();

function NewDevisNavigator() {
  return (
    <NewDevisStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <NewDevisStack.Screen
        name="ClientSelect"
        component={ClientSelectScreen}
        options={{ title: 'Sélectionner un client' }}
      />
      <NewDevisStack.Screen
        name="MachineSelect"
        component={MachineSelectScreen}
        options={{ title: 'Choisir une machine' }}
      />
      <NewDevisStack.Screen
        name="Calculation"
        component={CalculationScreen}
        options={{ title: 'Calcul' }}
      />
      <NewDevisStack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ title: 'Services' }}
      />
      <NewDevisStack.Screen
        name="DevisSummary"
        component={DevisSummaryScreen}
        options={{ title: 'Récapitulatif' }}
      />
    </NewDevisStack.Navigator>
  );
}

function HistoryNavigator() {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <HistoryStack.Screen
        name="HistoryList"
        component={HistoryScreen}
        options={{ title: 'Historique' }}
      />
      <HistoryStack.Screen
        name="DevisDetail"
        component={DevisDetailScreen}
        options={{ title: 'Détail du devis' }}
      />
    </HistoryStack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.surface,
          borderTopColor: colors.border.subtle,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'NewDevisTab') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'HistoryTab') {
            iconName = focused ? 'time' : 'time-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Accueil' }}
      />
      <Tab.Screen
        name="NewDevisTab"
        component={NewDevisNavigator}
        options={{ tabBarLabel: 'Nouveau devis' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryNavigator}
        options={{ tabBarLabel: 'Historique' }}
      />
    </Tab.Navigator>
  );
}
