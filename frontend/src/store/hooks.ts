import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from './store'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T extends (state: RootState) => any>(selector: T) =>
  useSelector(selector)
