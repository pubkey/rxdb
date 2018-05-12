<template>
<div class="heroes-list">
    <ul v-if="results">
        <li v-for="hero in results">
            <div class="color-box" v-bind:style="{ backgroundColor: hero.color }"></div>
            <span class="hero-name">{{ hero.name }}</span>
            <div class="life">
                <div class="currentPercent" v-bind:style="{ width: hero.hpPercent() +'%' }"></div>
            </div>
            <div class="actions">
                <i class="fa fa-pencil-square-o" aria-hidden="true" v-on:click="editHero(hero)"></i>
                <i class="fa fa-trash-o" aria-hidden="true" v-on:click="removeHero(hero)"></i>
            </div>
        </li>
    </ul>
    <span v-else>Loading..</span>

</div>
</template>

<script>
import Vue from 'vue';
import * as Database from '../database/Database';
import {
    filter
} from 'rxjs/operators';

export default Vue.component('heroes-list', {
    data: () => {
        return {
            results: [],
            subs: []
        };
    },
    mounted: async function() {
        const db = await Database.get();
        this.subs.push(
            db.heroes
            .find().$
            .pipe(
                filter(x => x != null)
            ).subscribe(results => {
                console.log('results:');
                //                console.dir(results);
                this.results = results;
            })
        );
    },
    beforeDestroy: function() {
        this.subs.forEach(sub => sub.unsubscribe());
    },
    methods: {
        removeHero(hero) {
            hero.remove();
        },
        editHero(hero) {
            this.$emit('edit', hero);
        }
    }
});
</script>


<style>
ul {
    list-style: none;
    padding: 0 16px;
    display: inline-block;
    position: relative;
    width: 100%;
}

ul li {
    width: 100%;
    float: left;
    margin-top: 6px;
    margin-bottom: 6px;
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

.life {
    width: 85%;
    height: 2px;
    background-color: red;
    float: left;
    position: absolute;
    margin-left: 4%;
    left: 10px;
}

.life .currentPercent {
    height: 100%;
    background-color: green;
}

.actions {
    float: right;
}

.actions i {
    cursor: pointer;
}
</style>
