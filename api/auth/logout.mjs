import { dispatch } from '../_handler.mjs'
export default (request, response) => dispatch('auth/logout', request, response)
