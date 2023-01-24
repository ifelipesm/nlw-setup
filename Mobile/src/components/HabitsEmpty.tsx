import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native'

export function HabitsEmpty(){
  const {navigate} = useNavigation();
  return (
    <Text
    className="text-zinc-400 text-base"
    >Não há hábitos cadastrados neste dia. {' '}
      <Text
      className="text-violet-400 text-base underline"
      onPress={() => navigate('new')}
      >Cadastre um hábito!
      </Text>
    </Text>
  );
}