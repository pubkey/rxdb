<template>
  <q-dialog @hide="onHide" persistent :model-value="true">
    <q-card class="phc__card" style="min-width: 360px">
      <q-card-section v-if="hero">
        <q-form ref="form" class="row q-col-gutter-sm" @submit="onFormSubmit">
          <div class="col col-12">
            <rx-input
              v-model="hero.name"
              class="phc__name"
              label="Name"
              :rules="[(val) => !!val || 'Name is required']"
            />
          </div>
          <div class="col col-12">
            <rx-color-input
              v-model="hero.color"
              class="phc__color"
              label="Color"
              :rules="[(val) => !!val || 'Color is required']"
            />
          </div>
        </q-form>
      </q-card-section>
      <q-separator />

      <q-card-actions align="right">
        <q-btn
          v-close-popup
          class="phc__close"
          color="primary"
          label="Close"
          icon="close"
          flat
        />
        <q-btn
          type="submit"
          class="phc__save"
          color="primary"
          label="Save"
          icon="save"
          @click="onFormSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';
import { QForm, useQuasar } from 'quasar';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useHeroCreateStore } from 'src/stores/hero/create';
import RxInput from 'src/components/RxInput.vue';
import RxColorInput from 'src/components/RxColorInput.vue';

const heroStore = useHeroCreateStore();
const { hero } = storeToRefs(heroStore);
onScopeDispose(async () => {
  heroStore.dispose();
});

const router = useRouter();
const quasar = useQuasar();

const form = ref<QForm>();
function onHide() {
  router.push({ name: 'hero-list' });
}

async function onFormSubmit() {
  const isValid = await form.value?.validate();
  if (!isValid) {
    return quasar.notify({
      message: 'Verify all the fields',
      color: 'warning',
    });
  }
  try {
    await heroStore.save();
    quasar.notify({ message: 'Hero Created', color: 'positive' });
    onHide();
  } catch {
    quasar.notify({ message: 'Something is wrong', color: 'negative' });
  }
}
</script>
