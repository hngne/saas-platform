import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useCartStore } from "./stores/cart.store";
import { useCustomerAuthStore } from "./stores/customer-auth.store";
import "./styles/theme.css";
import "./styles/base.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
useCartStore(pinia).hydrate();
const customerAuth = useCustomerAuthStore(pinia);
customerAuth.hydrate();
customerAuth.bootstrapAuth().catch(() => null);
app.use(router).mount("#app");
