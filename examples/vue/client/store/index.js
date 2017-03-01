import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const state = {
    count: 0
};

const mutations = {
    INCREMENT(state) {
        state.count++;
    },
    DECREMENT(state) {
        state.count--;
    }
};

const actions = {
    incrementAsync({
        commit
    }) {
        setTimeout(() => {
            commit('INCREMENT');
        }, 200);
    }
};

const store = new Vuex.Store({
    state,
    mutations,
    actions
});

export default store
