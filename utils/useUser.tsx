import { useEffect, useState, createContext, useContext } from 'react';
import {
  useUser as useSupaUser,
  User
} from '@supabase/supabase-auth-helpers/react';
import { UserDetails } from 'types';
import { Subscription } from 'types';
import { SupabaseClient } from '@supabase/supabase-auth-helpers/nextjs';
import { RealtimeSubscription } from '@supabase/realtime-js';

type UserContextType = {
  accessToken: string | null;
  user: User | null;
  userDetails: UserDetails | null;
  isLoading: boolean;
  subscription: Subscription | null;
};

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export interface Props {
  supabaseClient: SupabaseClient;
  [propName: string]: any;
}

export const MyUserContextProvider = (props: Props) => {
  const { supabaseClient: supabase } = props;
  const { user, accessToken, isLoading: isLoadingUser } = useSupaUser();
  const [isLoadingData, setIsloadingData] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  const getUserDetails = () =>
    supabase.from<UserDetails>('users').select('*').single();


  useEffect(() => {
    let sub: RealtimeSubscription
    if (user && !isLoadingData) {
       sub = supabase
        .from('users')
        .on('*', async (payload) => {
          setUserDetails(payload.new)
        })
        .subscribe();
    }
    return () => {
      if (sub) sub.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user && !isLoadingData && !userDetails) {
      setIsloadingData(true);
      Promise.allSettled([getUserDetails()]).then(
        (results) => {
          const userDetailsPromise = results[0];

          if (userDetailsPromise.status === 'fulfilled')
            setUserDetails(userDetailsPromise.value.data);

          setIsloadingData(false);
        }
      );
    } else if (!user && !isLoadingUser && !isLoadingData) {
      setUserDetails(null);
    }
  }, [user, isLoadingUser]);

  const value = {
    accessToken,
    user,
    userDetails,
    isLoading: isLoadingUser || isLoadingData,
    subscription: null
  };

  return <UserContext.Provider value={value} {...props} />;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error(`useUser must be used within a MyUserContextProvider.`);
  }
  return context;
};
