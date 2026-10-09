import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CefrLevel } from '../types';

export type MainTabParamList = {
  Home: undefined;
  Learn: undefined;
  Words: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  WordDetail: { wordId: string };
  Review: undefined;
  Level: { level: CefrLevel };
  Unit: { level: CefrLevel; unitNo: number };
  Topic: { level: CefrLevel; code: string };
  UnitWords: { level: CefrLevel; unitNo: number };
  Quiz: { level: CefrLevel; kind: 'unit' | 'exam'; unitNo?: number };
};

export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
