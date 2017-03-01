<template>
<div class="heroes-list">
    <ul v-if="results">
        <li v-for="hero in results">
            {{ hero.name }}
        </li>
    </ul>
    <span v-else>Loading..</span>

</div>
</template>

<script>
import * as Database from '../database/Database';

export default {
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
            .filter(x => x != null)
            .subscribe(results => {
                console.log('results:');
                //                console.dir(results);
                this.results = results;
            })
        );
    },
    beforeDestroy: function() {
        this.subs.forEach(sub => sub.unsubscribe());
    },
    methods: {}
}
</script>


<style>
.heroes-list {}
</style>
