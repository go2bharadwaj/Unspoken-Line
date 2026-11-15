import React from 'react';
import { PackProps } from './kit';
import { ActOfKindness } from './ActOfKindness';
import { AweWalk } from './AweWalk';
import { BestPossibleSelfWriting } from './BestPossibleSelfWriting';
import { BriskWalk10min } from './BriskWalk10min';
import { ColouringStructured } from './ColouringStructured';
import { CyclicSighing } from './CyclicSighing';
import { DaylightExposure } from './DaylightExposure';
import { EverydayCreativeActivity } from './EverydayCreativeActivity';
import { ExploreWhilePositive } from './ExploreWhilePositive';
import { FreeDancing } from './FreeDancing';
import { GratitudeLetter } from './GratitudeLetter';
import { GratitudeList } from './GratitudeList';
import { GuidedImagery } from './GuidedImagery';
import { LovingKindnessMeditation } from './LovingKindnessMeditation';
import { MicroBreak } from './MicroBreak';
import { ModerateExercise } from './ModerateExercise';
import { MovementBreaks } from './MovementBreaks';
import { MusicListeningCalming } from './MusicListeningCalming';
import { NapShort } from './NapShort';
import { NatureSitting } from './NatureSitting';
import { Photography } from './Photography';
import { ProgressiveMuscleRelaxation } from './ProgressiveMuscleRelaxation';
import { Savoring } from './Savoring';
import { SelfCompassionExercise } from './SelfCompassionExercise';
import { ShareGoodNews } from './ShareGoodNews';
import { SlowBreathing } from './SlowBreathing';
import { StairWalking } from './StairWalking';
import { ThirdPersonSelfTalk } from './ThirdPersonSelfTalk';
import { WatchComedy } from './WatchComedy';
import { WorryPostponement } from './WorryPostponement';
import { WritePlanTodo } from './WritePlanTodo';

/** pack_id (from activity_pack.json) -> its custom animated activity. Generated; one entry per unique activity. */
export const PACK_COMPONENTS: Record<string, React.ComponentType<PackProps>> = {
  act_of_kindness: ActOfKindness,
  awe_walk: AweWalk,
  best_possible_self_writing: BestPossibleSelfWriting,
  brisk_walk_10min: BriskWalk10min,
  colouring_structured: ColouringStructured,
  cyclic_sighing: CyclicSighing,
  daylight_exposure: DaylightExposure,
  everyday_creative_activity: EverydayCreativeActivity,
  explore_while_positive: ExploreWhilePositive,
  free_dancing: FreeDancing,
  gratitude_letter: GratitudeLetter,
  gratitude_list: GratitudeList,
  guided_imagery: GuidedImagery,
  loving_kindness_meditation: LovingKindnessMeditation,
  micro_break: MicroBreak,
  moderate_exercise: ModerateExercise,
  movement_breaks: MovementBreaks,
  music_listening_calming: MusicListeningCalming,
  nap_short: NapShort,
  nature_sitting: NatureSitting,
  photography: Photography,
  progressive_muscle_relaxation: ProgressiveMuscleRelaxation,
  savoring: Savoring,
  self_compassion_exercise: SelfCompassionExercise,
  share_good_news: ShareGoodNews,
  slow_breathing: SlowBreathing,
  stair_walking: StairWalking,
  third_person_self_talk: ThirdPersonSelfTalk,
  watch_comedy: WatchComedy,
  worry_postponement: WorryPostponement,
  write_plan_todo: WritePlanTodo,
};
