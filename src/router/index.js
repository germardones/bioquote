import { auth } from '../firebase/firebaseConfig'

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = auth.currentUser
  const protectedRoutes = ['/dashboard', '/cotizar']

  if (protectedRoutes.includes(to.path) && !user) {
    next('/')
  } else {
    next()
  }
})

export default router
