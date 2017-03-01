<template>
<div class="insert">
    <form v-on:submit.prevent="onSubmit" name="insertForm">
        <input v-model="name" type="text" name="name" placeholder="Name" />
        <br/>
        <input v-model="color" type="text" name="color" placeholder="Color" />
        <br/>
        <button>Submit</button>
    </form>
</div>
</template>

<script>
import * as Database from '../database/Database';

export default {
    data: () => {
        return {
            name: '',
            color: ''
        };
    },
    methods: {
        async onSubmit() {
            console.log('OnSubmit');
            console.dir(this);
            const db = await Database.get();
            const obj = {
                name: this.name,
                color: this.color
            }
            console.dir(obj);
            await db.heroes.insert(obj);
            console.log('Inserted new hero: ' + this.name);

            this.name = '';
            this.color = '';
        }
    }
}
</script>


<style>
.insert {}
</style>
