<template>
    <div>
      <component :is="steps[step]" @next="step++" />
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import Step1 from '../components/Step1ServiceSelector.vue'
  import Step2 from '../components/Step2ExtrasSelector.vue'
  import Step3 from '../components/Step3HoursInput.vue'
  import Step4 from '../components/Step4ClientData.vue'
  import Step5 from '../components/Step5Summary.vue'
  
  const step = ref(0)
  const steps = [Step1, Step2, Step3, Step4, Step5]
  </script>
  