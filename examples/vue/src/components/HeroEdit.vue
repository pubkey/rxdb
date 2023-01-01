<template>
  <div id="edit-box" class="hero-edit box">
    <h4>Edit</h4>
    <div class="alert" v-if="!synced">
      <h4>Warning:</h4>
      <p>
        Someone else has
        <b>changed</b> this document. If you click save, you will overwrite the
        changes.
      </p>
      <button @click="onResyncClick()">resync</button>
    </div>
    <div class="alert deleted" v-if="hero.deleted">
      <h4>Error:</h4>
      <p>
        Someone else has
        <b>deleted</b> this document. You can not save anymore.
      </p>
    </div>
    <h5>
      <div
        class="color-box"
        :style="{ 'background-color': hero.color }"
      ></div>
      {{ hero.name }}
    </h5>
    HP:
    <input
      id="hp-edit-input"
      type="number"
      v-model="formData"
      min="0"
      :max="hero.maxHP"
      name="hp"
    />
    <br />
    <button @click="onCancelClick()">cancel</button>
    <button id="edit-submit-button" @click="onSubmitClick()" v-if="!hero.deleted">
      submit
    </button>
  </div>
</template>

<script lang="ts">
import { RxHeroDocument } from '@/RxDB';
import { firstValueFrom } from 'rxjs';
import { skip, map } from 'rxjs/operators';
import { defineComponent, ref } from 'vue';

export default defineComponent({
  name: 'HeroEdit',
  props: {
    hero: {
      type: Object as () => RxHeroDocument,
      required: true
    }
  },
  emits: [
    'cancel',
    'submit'
  ],
  setup(props, { emit }) {
    const formData = ref(props.hero.hp);
    const synced = ref<boolean>(true);
    const deleted = ref<boolean>(false);

    firstValueFrom(
      props.hero.$.pipe(
        skip(1),
        map(() => false)
      )
    ).then((v: boolean) => (synced.value = v));

    firstValueFrom(props.hero.deleted$).then(() => (deleted.value = true));

    const onCancelClick = () => {
      console.log('heroEdit.onCancelClick()');
      emit('cancel');
    };

    const onSubmitClick = async () => {
      console.log('heroEdit.onSubmitClick()');
      await props.hero.incrementalPatch({ hp: props.hero.hp });
      emit('submit');
    };

    const onResyncClick = () => {
      console.log('heroEdit.onResyncClick()');
      formData.value = props.hero.hp;
      synced.value = true;
    };

    return {
      synced,
      deleted,
      formData,
      onCancelClick,
      onSubmitClick,
      onResyncClick
    };
  }
});
</script>


<style scoped lang="scss">
.hero-edit {
  position: fixed;
  z-index: 10;
  width: 70%;
  margin-left: 10%;
  min-height: 200px;
  margin-top: -5px;
  padding: 20px;
}

.alert {
  border-style: solid;
  border-width: 2px;
  border-radius: 10px;
  padding: 8px;
  border-color: #e0e021;

  &.deleted {
    border-color: red;
  }

  h4 {
    padding: 0;
    margin: 0;
  }
}

.color-box {
  width: 20px;
  height: 20px;
  float: left;
  margin-right: 11px;
  border-radius: 2px;
  border-width: 1px;
  border-style: solid;
  border-color: grey;
}
</style>
