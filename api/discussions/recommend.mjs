import { dispatch } from '../_handler.mjs'

export default (request, response) => dispatch('discussions/recommend', request, response)
