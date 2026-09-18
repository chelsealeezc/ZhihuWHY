import { dispatch } from '../_handler.mjs'

export default (request, response) => dispatch('discussions/selection', request, response)
