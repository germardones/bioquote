import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const title = ref('Información')

export function useAlert() {
    const showAlert = (msg, modalTitle = 'Información') => {
        message.value = msg
        title.value = modalTitle
        visible.value = true
    }

    const closeAlert = () => {
        visible.value = false
    }

    return {
        visible,
        message,
        title,
        showAlert,
        closeAlert
    }
}
